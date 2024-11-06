export const extractTagsFromText = (data: string): string[] => {
  const splitted = data.split(' ');

  const allTags: string[] = splitted.reduce((aggregated, current) => {
    if (current.startsWith('#')) {
      aggregated.push(current.replace(/#/g, '').toLowerCase());
    }

    return aggregated;
  }, [] as string[]);

  return allTags;
};

export const extractTagUserFromText = (data: string): string[] => {
  const splitted = data.split(' ');
  const regexMultipleAdjacentAtSigns = /@@+/;
  const regexCharactersBetweenAtSigns = /@[^@]+@/;

  const allTags: string[] = splitted.reduce((aggregated, current) => {
    if (
      current.startsWith('@') &&
      !regexMultipleAdjacentAtSigns.test(current) &&
      !regexCharactersBetweenAtSigns.test(current)
    ) {
      aggregated.push(current.replace(/@/g, ''));
    }

    return aggregated;
  }, [] as string[]);

  return allTags;
};
