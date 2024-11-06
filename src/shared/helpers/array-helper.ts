export const removeDuplicateObjects = (arr: any[], key: string) => {
  const seen = new Set();
  return arr.filter((obj) => {
    const keyValue = key ? obj[key] : JSON.stringify(obj);
    if (!seen.has(keyValue)) {
      seen.add(keyValue);
      return true;
    }
    return false;
  });
};
