export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

export const replaceVariables = (
  text: string,
  variables: Record<string, string>
): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
};

export const extractVariables = (text: string): string[] => {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return matches.map((match) => match.replace(/[{}]/g, ""));
};
