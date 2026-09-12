import { QuerySnapshot, DocumentData } from "firebase/firestore";

/** Every Firestore doc read in this app is mapped this way: spread the data, keep `id` from the doc. */
export function mapDocs<T>(snap: QuerySnapshot<DocumentData>): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}
