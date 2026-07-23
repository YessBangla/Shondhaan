# TODO - Deal messaging socket-only fix

- [ ] Update `DealSection.tsx` to remove Supabase-based `deal_messages` fetching in the `messages` tab.
- [ ] Use `useDealConversations()` (socket.io + react-query) in `DealSection.tsx` to render conversation list.
- [ ] Add/ensure socket join or rely on existing socket connection patterns.
- [ ] Fix any TypeScript/UI issues introduced by refactor.
- [ ] Run frontend typecheck/build (if available) and manually verify:
  - Messages tab shows conversations
  - Unread badge works
  - Chat modal opens correctly from conversation click

