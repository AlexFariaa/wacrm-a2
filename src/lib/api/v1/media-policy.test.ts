import {expect,it} from 'vitest';
import {validateMediaUpload,trustedMediaUrl,limitedBytes} from './media-policy';
it('caps actual streamed bytes even without content length',async()=>{
 let cancelled=false;
 const body=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
 await expect(limitedBytes(new Response(body),10)).rejects.toThrow('media_too_large');
 expect(cancelled).toBe(true);
 expect((await limitedBytes(new Response('small'),10)).toString()).toBe('small');
});
it('rejects active content, forged image MIME, and oversized uploads',()=>{
 expect(()=>validateMediaUpload('image/svg+xml',Buffer.from('<svg/>'))).toThrow();
 expect(()=>validateMediaUpload('image/png',Buffer.from('<script>'))).toThrow();
 expect(()=>validateMediaUpload('image/jpeg',Buffer.alloc(6*1024*1024))).toThrow();
 expect(validateMediaUpload('application/pdf',Buffer.from('%PDF-1.4\nhello')).kind).toBe('document');
});
it('only proxies storage URLs from the configured project and owning account',()=>{
 expect(trustedMediaUrl('https://project.supabase.co/storage/v1/object/public/chat-media/account-a/test.pdf','https://project.supabase.co','a')).toBe(true);
 expect(trustedMediaUrl('https://project.supabase.co/storage/v1/object/public/chat-media/account-b/test.pdf','https://project.supabase.co','a')).toBe(false);
 expect(trustedMediaUrl('http://127.0.0.1/secret','https://project.supabase.co','a')).toBe(false);
});
