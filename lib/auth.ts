import crypto from "crypto";
import { cookies } from "next/headers";
const COOKIE_NAME="lyberch-admin";
export function validToken(value?:string){
  const secret=process.env.AUTH_SECRET; if(!secret||!value)return false;
  const [exp,sig]=value.split("."); if(!exp||!sig||Number(exp)<Date.now())return false;
  const expected=crypto.createHmac("sha256",secret).update(exp).digest("hex");
  return sig.length===expected.length && crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected));
}
export function isAuthenticated(){return validToken(cookies().get(COOKIE_NAME)?.value);}
