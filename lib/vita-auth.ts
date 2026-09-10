import {headers} from 'next/headers';
export async function authenticated(){const h=await headers();return !!h.get('oai-authenticated-user-id')&&!!h.get('oai-authenticated-user-email');}
