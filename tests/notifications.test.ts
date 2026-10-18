import assert from "node:assert/strict";
import test from "node:test";

interface MockNotification {
  id: string;
  readAt: Date | null;
}

function calculateUnreadCount(notifications: MockNotification[]): number {
  return notifications.filter((n) => n.readAt === null).length;
}

test("calculateUnreadCount counts only unread notifications accurately", () => {
  const list: MockNotification[] = [
    { id: "1", readAt: null },
    { id: "2", readAt: new Date() },
    { id: "3", readAt: null },
    { id: "4", readAt: new Date() },
  ];

  assert.equal(calculateUnreadCount(list), 2);
});

test("calculateUnreadCount returns 0 for all-read or empty lists", () => {
  assert.equal(calculateUnreadCount([]), 0);
  assert.equal(
    calculateUnreadCount([
      { id: "1", readAt: new Date() },
      { id: "2", readAt: new Date() },
    ]),
    0
  );
});
