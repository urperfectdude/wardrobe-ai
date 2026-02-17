import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

console.log("Hello from sync-user-avatar!")

serve(async (req: Request) => {
  try {
    const { record } = await req.json()
    
    // 1. Validate payload
    if (!record || !record.id || !record.raw_user_meta_data) {
        console.log("Invalid payload or missing metadata")
        return new Response("Invalid payload", { status: 400 })
    }
    
    // Check for picture in metadata (standard for Google Auth)
    const pictureUrl = record.raw_user_meta_data.picture || record.raw_user_meta_data.avatar_url
    
    if (!pictureUrl) {
        console.log("No picture found in metadata")
        return new Response("No picture found in metadata", { status: 200 })
    }

    console.log(`Found picture URL: ${pictureUrl}`)

    // 2. Setup Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Fetch image from Google
    console.log(`Fetching image...`)
    const imageRes = await fetch(pictureUrl)
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.statusText}`)
    
    const imageBlob = await imageRes.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    
    // 4. Upload to Storage
    // Using closet-items bucket as it's already configured for user content
    const userId = record.id
    const timestamp = Date.now()
    const fileName = `${userId}/google_avatar_${timestamp}.jpg` 

    console.log(`Uploading to closet-items/${fileName}`)
    const { data: _uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('closet-items')
      .upload(fileName, buffer, {
        contentType: imageBlob.type || 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw uploadError
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('closet-items')
      .getPublicUrl(fileName)

    console.log('Public URL generated:', publicUrl)

    // 6. Update User Profile
    // We update 'profile_picture' and 'selfie_url' for backward compatibility
    console.log(`Updating profile for user ${userId}`)
    
    // Use upsert to handle case where profile doesn't exist yet 
    // (though usually created by handle_new_user trigger, race conditions may apply)
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        profile_picture: publicUrl,
        selfie_url: publicUrl, // Legacy support
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
    }

    console.log('Successfully synced avatar')

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    })

  } catch (error: any) {
    console.error('Error processing avatar:', error)
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    })
  }
})
