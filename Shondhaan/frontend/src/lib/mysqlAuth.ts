import { ROLES, type RoleKey } from "@/config/roles";

export interface MySqlAuthUser {
  id: number;
  shondhaan_id?: string | null;
  name: string;
  mobile: string;
  address: string | null;
  email: string;
  type: RoleKey;
  role?: RoleKey;
  shop_name?: string | null;
  shop_type?: string | null;
}

interface AuthResponse {
  message: string;
  user: MySqlAuthUser;
  token?: string;
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_CENTRAL_API_BASE_URL
).replace(/\/+$/, "");

const STORAGE_KEY = "yess_mysql_auth";
const VALID_ROLES = new Set(ROLES.map((role) => role.key));

const DEFAULT_REQUEST_TIMEOUT_MS = 2000;


const normalizeRoleKey = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") as RoleKey;



// ===============================
// Common Request With Cookie
// ===============================

export async function requestWithTimeout<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<T> {

  const controller = new AbortController();

  const timeoutError = new Error(
    `Request timed out after ${timeoutMs}ms`
  );


  const timeoutPromise = new Promise<never>((_, reject) => {

    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(timeoutError);
    }, timeoutMs);


    controller.signal.addEventListener(
      "abort",
      () => clearTimeout(timeoutId)
    );

  });


  try {

    const response = await Promise.race([

      fetch(`${API_BASE_URL}${path}`, {

        method:"POST",

        credentials:"include",

        headers:{
          "Content-Type":"application/json",
        },

        body:JSON.stringify(body),

        signal:controller.signal,

      }),

      timeoutPromise

    ]);


    const data = await response.json().catch(()=>({}));


    if(!response.ok){

      const error = new Error(
        data.message || "Request failed"
      );

      (error as Error & {status?:number}).status =
        response.status;

      throw error;
    }


    return data as T;


  }catch(error){

    if(error === timeoutError || controller.signal.aborted){
      throw timeoutError;
    }

    throw error;
  }

}



async function request<T>(
  path:string,
  body:Record<string,unknown>
){
  return requestWithTimeout<T>(path,body);
}



// ===============================
// Signup
// ===============================


export async function requestSignupOtp(payload:{
  name:string;
  mobile:string;
  address:string;
  email:string;
  password:string;
  type?:RoleKey|string;
  shop_name?:string;
  shop_type?:string;
}){

  return request<{message:string}>(
    "/api/auth/signup/request-otp",
    payload
  );

}



export async function verifySignupOtp(
 payload:{
  email:string;
  otp:string;
 }
){

 const data =
 await request<AuthResponse>(
   "/api/auth/signup/verify-otp",
   payload
 );


 saveMySqlAuth(data);


 return data;

}



// ===============================
// Login
// ===============================


export async function updateMySqlProfile(payload: {
  name?: string;
  mobile?: string;
  address?: string;
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/users/me/profile`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Could not update profile"
    );
  }

  // update cached user info
  const auth = getMySqlAuth();

  if (auth?.user) {
    auth.user = {
      ...auth.user,
      ...data,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(auth)
    );

    window.dispatchEvent(
      new Event("yess-mysql-auth-changed")
    );
  }

  return data;
}
export async function loginWithMySql(
 payload:{
  identifier:string;
  password:string;
 }
){

 const data =
 await request<AuthResponse>(
   "/api/auth/login",
   payload
 );


 // Cookie is already saved by backend
 saveMySqlAuth(data);


 return data;

}




// ===============================
// Admin Users
// ===============================


export async function listMySqlUsers(){

 const auth = getMySqlAuth();

 const response =
 await fetch(
 `${API_BASE_URL}/api/admin/users`,
 {
   method:"GET",
   credentials:"include",
   headers: auth?.token
    ? { Authorization: `Bearer ${auth.token}` }
    : undefined,
 }
 );


 const data =
 await response.json().catch(()=>({}));


 if(!response.ok){
   throw new Error(
     data.message || "Could not load users"
   );
 }


 return data as {
   users:Array<{
    id:number;
    name:string;
    mobile:string;
    address:string|null;
    email:string;
    type:RoleKey;
    email_verified:boolean;
    created_at:string;
    updated_at:string;
   }>
 };

}




export async function createMySqlUser(payload:{
 name:string;
 mobile:string;
 address?:string|null;
 email:string;
 password:string;
 type:RoleKey;
}){

 const auth = getMySqlAuth();

 const response =
 await fetch(
 `${API_BASE_URL}/api/admin/users`,
 {
  method:"POST",

  credentials:"include",

  headers:{
    "Content-Type":"application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  },

  body:JSON.stringify(payload)

 });


 const data =
 await response.json().catch(()=>({}));


 if(!response.ok){
  throw new Error(
   data.message || "Could not create user"
  );
 }


 return data;

}




export async function updateMySqlUserType(
 userId:number,
 type:RoleKey
){

 const auth = getMySqlAuth();

 const response =
 await fetch(
 `${API_BASE_URL}/api/admin/users/${userId}/type`,
 {
  method:"PATCH",

  credentials:"include",

  headers:{
    "Content-Type":"application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  },

  body:JSON.stringify({type})

 });


 const data =
 await response.json().catch(()=>({}));


 if(!response.ok){
  throw new Error(
   data.message || "Could not update user type"
  );
 }


 return data;

}




// ===============================
// Bootstrap
// ===============================


export async function bootstrapMySqlSuperAdmin(payload:{
 bootstrap_key:string;
 email:string;
 password:string;
 name?:string;
 mobile?:string;
}){


 const response =
 await fetch(
 `${API_BASE_URL}/api/admin/bootstrap-super-admin`,
 {
  method:"POST",

  credentials:"include",

  headers:{
   "Content-Type":"application/json"
  },

  body:JSON.stringify(payload)
 });


 const data =
 await response.json().catch(()=>({}));


 if(!response.ok){
  throw new Error(
   data.message || "Could not bootstrap super admin"
  );
 }


 return data as {
  message:string;
 };

}



// ===============================
// Auth Storage
// ===============================


export function saveMySqlAuth(
 data:AuthResponse
){

 const type =
 normalizeRoleKey(
  data.user.type ||
  data.user.role ||
  "user"
 );


 data.user.type = type;
 data.user.role = type;


  localStorage.setItem(
   STORAGE_KEY,
   JSON.stringify({
    user:data.user,
    token: data.token || null
   })
  );


 window.dispatchEvent(
  new Event("yess-mysql-auth-changed")
 );

}




export function getMySqlAuth()
:AuthResponse|null{


 try{

  const raw =
  localStorage.getItem(STORAGE_KEY);


  if(!raw)
    return null;


  const data =
  JSON.parse(raw);


  if(!data?.user)
    return null;



  const type =
  normalizeRoleKey(
    data.user.type ||
    data.user.role
  );


  if(!type || !VALID_ROLES.has(type))
    return null;



  data.user.type = type;
  data.user.role = type;


  return data;


 }catch{

  return null;

 }

}




export function clearMySqlAuth(){

 localStorage.removeItem(STORAGE_KEY);


 window.dispatchEvent(
  new Event("yess-mysql-auth-changed")
 );

}
