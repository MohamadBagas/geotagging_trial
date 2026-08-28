import { getAccessToken } from './auth';

export async function uploadToDrive(file: File | Blob, filename: string, mimeType: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to upload to Google Drive');
  }

  const metadata = {
    name: filename,
    mimeType: mimeType
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Drive upload error:', errText);
      throw new Error(`Failed to upload to Drive: ${res.statusText}`);
    }

    const data = await res.json();
    return data.webViewLink; // We'll return the Drive webViewLink to save in Firestore
  } catch (err) {
    console.error('Error uploading to Drive:', err);
    throw err;
  }
}
