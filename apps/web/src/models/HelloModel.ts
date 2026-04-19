import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

const HELLO_QUERY = '{ hello }';

interface HelloQueryResult {
  hello: string;
}

export class HelloModel {
  message = '';
  loading = false;
  error: string | null = null;

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const data = await this.fetcher<HelloQueryResult>(HELLO_QUERY);
      runInAction(() => {
        this.message = data.hello;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }
}
