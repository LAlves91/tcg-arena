import { canonicalPair, isMember, otherUserId } from './friend-pair';

describe('canonicalPair', () => {
  it('places the lexicographically smaller id first regardless of argument order', () => {
    expect(canonicalPair('aaa', 'bbb')).toEqual({ userAId: 'aaa', userBId: 'bbb' });
    expect(canonicalPair('bbb', 'aaa')).toEqual({ userAId: 'aaa', userBId: 'bbb' });
  });

  it('throws if the two ids are the same', () => {
    expect(() => canonicalPair('x', 'x')).toThrow(/distinct/);
  });
});

describe('otherUserId / isMember', () => {
  const pair = { userAId: '1', userBId: '2' };

  it('returns the other id', () => {
    expect(otherUserId(pair, '1')).toBe('2');
    expect(otherUserId(pair, '2')).toBe('1');
  });

  it('throws when self is not a member', () => {
    expect(() => otherUserId(pair, '3')).toThrow();
  });

  it('isMember detects membership', () => {
    expect(isMember(pair, '1')).toBe(true);
    expect(isMember(pair, '2')).toBe(true);
    expect(isMember(pair, '3')).toBe(false);
  });
});
