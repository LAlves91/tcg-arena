/**
 * The Friendship row stores the pair canonicalised so userAId < userBId
 * lexicographically. That makes the unique constraint trivial and means
 * every helper that needs the row reads/writes the same way.
 */
export function canonicalPair(x: string, y: string): { userAId: string; userBId: string } {
  if (x === y) {
    throw new Error('canonicalPair requires two distinct ids');
  }
  return x < y ? { userAId: x, userBId: y } : { userAId: y, userBId: x };
}

export function otherUserId(pair: { userAId: string; userBId: string }, self: string): string {
  if (pair.userAId === self) return pair.userBId;
  if (pair.userBId === self) return pair.userAId;
  throw new Error('self is not part of the pair');
}

export function isMember(pair: { userAId: string; userBId: string }, userId: string): boolean {
  return pair.userAId === userId || pair.userBId === userId;
}
