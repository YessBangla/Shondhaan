const API = import.meta.env.VITE_DEAL_API_BASE_URL;

export async function getCategories() {
  const res = await fetch(`${API}/deal/categories`);
  return res.json();
}

export async function createCategory(data: any) {
  const res = await fetch(`${API}/deal/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function updateCategory(id: string, data: any) {
  const res = await fetch(`${API}/deal/categories/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function deleteCategory(id: string) {
  const res = await fetch(`${API}/deal/categories/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function getListings() {
  const res = await fetch(`${API}/deal/listings`);
  return res.json();
}