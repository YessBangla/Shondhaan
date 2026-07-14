// -----------------------------------------------------------------------
// Shared helper: resolve/create the deal_conversations row for a given
// listing + two participants.
//
// Schema (as provided):
//   deal_conversations: id, listing_id, buyer_id, seller_id, last_message,
//                        last_message_at, buyer_unread_count,
//                        seller_unread_count, status, created_at, updated_at
//   deal_messages:       id, conversation_id, sender_id, message, is_read,
//                        created_at
//
// Buyer/seller roles are resolved from deal_listings.user_id (the listing
// owner is always the seller). If neither participant is the owner
// (shouldn't normally happen, but data can be messy), falls back to a
// stable sorted order so repeated calls in either direction still resolve
// to the same conversation.
// -----------------------------------------------------------------------

async function resolveBuyerSeller(dealDb, listingId, userA, userB) {
  const [listingRows] = await dealDb.query(
    `SELECT user_id FROM deal_listings WHERE id = ?`,
    [listingId]
  );
  const ownerId = listingRows[0] ? String(listingRows[0].user_id) : null;

  if (ownerId === String(userA)) return { buyerId: String(userB), sellerId: String(userA) };
  if (ownerId === String(userB)) return { buyerId: String(userA), sellerId: String(userB) };

  console.warn(
    `resolveBuyerSeller: listing ${listingId} owner (${ownerId}) is neither ${userA} nor ${userB} — using fallback ordering`
  );
  const [a, b] = [String(userA), String(userB)].sort();
  return { buyerId: a, sellerId: b };
}

export async function getOrCreateConversation(dealDb, listingId, userA, userB) {
  const { buyerId, sellerId } = await resolveBuyerSeller(dealDb, listingId, userA, userB);

  const [existing] = await dealDb.query(
    `SELECT * FROM deal_conversations WHERE listing_id = ? AND buyer_id = ? AND seller_id = ?`,
    [listingId, buyerId, sellerId]
  );
  if (existing[0]) return existing[0];

  const [result] = await dealDb.query(
    `INSERT INTO deal_conversations (listing_id, buyer_id, seller_id, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', NOW(), NOW())`,
    [listingId, buyerId, sellerId]
  );

  const [rows] = await dealDb.query(`SELECT * FROM deal_conversations WHERE id = ?`, [result.insertId]);
  return rows[0];
}

// Given a conversation row + a sender, returns the other party's id and
// which unread-counter column belongs to them.
export function resolveReceiver(conversation, senderId) {
  const isSenderBuyer = String(conversation.buyer_id) === String(senderId);
  return {
    receiverId: isSenderBuyer ? conversation.seller_id : conversation.buyer_id,
    receiverUnreadColumn: isSenderBuyer ? "seller_unread_count" : "buyer_unread_count",
    senderUnreadColumn: isSenderBuyer ? "buyer_unread_count" : "seller_unread_count",
  };
}