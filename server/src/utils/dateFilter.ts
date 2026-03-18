export function fromFilter(filter?: string): Date | undefined {
  const now = new Date();

  if (filter === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (filter === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (filter === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return undefined;
}
