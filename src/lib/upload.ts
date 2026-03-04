const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Upload failed");
  return data.data.url as string;
}
