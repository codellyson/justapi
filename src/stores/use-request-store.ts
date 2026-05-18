import { create } from 'zustand';
import { HttpMethod } from '../utils/http';
import { KeyValuePair } from '../components/ui/key-value-editor';
import { FormDataPair } from '../utils/form-data';

export type BodyType = 'json' | 'form-data' | 'raw' | 'none';
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

interface RequestState {
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  bodyType: BodyType;
  body: string;
  formData: FormDataPair[];
  authType: AuthType;
  authConfig: {
    bearerToken?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setParams: (params: KeyValuePair[]) => void;
  setHeaders: (headers: KeyValuePair[]) => void;
  setBodyType: (type: BodyType) => void;
  setBody: (body: string) => void;
  setFormData: (formData: FormDataPair[]) => void;
  setAuthType: (type: AuthType) => void;
  setAuthConfig: (config: Partial<RequestState['authConfig']>) => void;
  reset: () => void;
}

const defaultParams: KeyValuePair[] = [];
const defaultHeaders: KeyValuePair[] = [
  { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
];

export const useRequestStore = create<RequestState>((set) => ({
  method: 'GET',
  url: '',
  params: defaultParams,
  headers: defaultHeaders,
  bodyType: 'none',
  body: '',
  formData: [],
  authType: 'none',
  authConfig: {},
  setMethod: (method) => set({ method }),
  setUrl: (url) => set({ url }),
  setParams: (params) => set({ params }),
  setHeaders: (headers) => set({ headers }),
  setBodyType: (type) => set({ bodyType: type }),
  setBody: (body) => set({ body }),
  setFormData: (formData) => set({ formData }),
  setAuthType: (type) => set({ authType: type }),
  setAuthConfig: (config) =>
    set((state) => ({ authConfig: { ...state.authConfig, ...config } })),
  reset: () =>
    set({
      method: 'GET',
      url: '',
      params: defaultParams,
      headers: defaultHeaders,
      bodyType: 'none',
      body: '',
      formData: [],
      authType: 'none',
      authConfig: {},
    }),
}));

