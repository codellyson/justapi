import type { CollectionItem } from '../stores/use-collections-store';

type ExampleSpec = Omit<CollectionItem, 'id' | 'createdAt' | 'updatedAt'>;

const jsonHeader = [
  { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
];

const createBody = JSON.stringify(
  {
    title: 'Hello from JUSTAPI',
    body: 'This is a sample post body.',
    userId: 1,
  },
  null,
  2
);

const updateBody = JSON.stringify(
  {
    id: 1,
    title: 'Updated title',
    body: 'Updated body.',
    userId: 1,
  },
  null,
  2
);

export const EXAMPLE_REQUESTS: ExampleSpec[] = [
  {
    name: 'List posts',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
    params: [
      { id: '1', key: '_limit', value: '5', enabled: true },
    ],
    headers: [],
    bodyType: 'none',
    body: '',
    authType: 'none',
    authConfig: {},
  },
  {
    name: 'Get a post',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    params: [],
    headers: [],
    bodyType: 'none',
    body: '',
    authType: 'none',
    authConfig: {},
  },
  {
    name: 'Create a post',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    params: [],
    headers: jsonHeader,
    bodyType: 'json',
    body: createBody,
    authType: 'none',
    authConfig: {},
  },
  {
    name: 'Update a post',
    method: 'PUT',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    params: [],
    headers: jsonHeader,
    bodyType: 'json',
    body: updateBody,
    authType: 'none',
    authConfig: {},
  },
  {
    name: 'Delete a post',
    method: 'DELETE',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    params: [],
    headers: [],
    bodyType: 'none',
    body: '',
    authType: 'none',
    authConfig: {},
  },
];
