const BASE=(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/,'');
export function getToken(){return localStorage.getItem('lawlens_access')}
async function request(path, options={}){const token=getToken(); const headers={'Content-Type':'application/json',...(options.headers||{})}; if(token) headers.Authorization=`Bearer ${token}`; const response=await fetch(`${BASE}${path}`,{...options,headers}); const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.detail || data.error || `Request failed (${response.status})`); return data}
export async function login(username,password){const data=await request('/auth/token/',{method:'POST',body:JSON.stringify({username,password})});localStorage.setItem('lawlens_access',data.access);localStorage.setItem('lawlens_refresh',data.refresh);return data}
export async function register(username,password){return request('/auth/register/',{method:'POST',body:JSON.stringify({username,password})})}
export const listConversations=()=>request('/conversations/');
export const getMessages=(id)=>request(`/conversations/${id}/messages/`);
export const createConversation=()=>request('/conversations/',{method:'POST',body:JSON.stringify({title:'New conversation'})});
export const sendChat=(message,conversation_id)=>request('/chat/',{method:'POST',body:JSON.stringify({message,...(conversation_id?{conversation_id}:{})})});
