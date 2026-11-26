export const failuresKeys = {
  all: ['failures'] as const,
  list: () => [...failuresKeys.all, 'list'] as const,
};
