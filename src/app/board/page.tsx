import type { Metadata } from "next";
import { verifySession } from "./lib/auth-check";
import { getBoardData } from "./lib/get-board-data";
import BoardView from "./BoardView";

// Certificate Transparency logs are one discovery vector for a hidden URL
// (closed already by using a path on the existing domain rather than a new
// subdomain, so no new certificate is ever issued). A search engine
// indexing this URL once it exists is the other, and this closes it too.
export const metadata: Metadata = {
  title: "Board",
  robots: { index: false, follow: false },
};

export default async function BoardPage() {
  await verifySession();
  const data = await getBoardData();
  return <BoardView data={data} />;
}
