/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IndexPatternsService } from './index_patterns';
import { fieldFormatsMock } from '../../field_formats/mocks';
import {
  UiSettingsCommon,
  IIndexPatternsApiClient,
  SavedObjectsClientCommon,
  SavedObject,
} from '../types';

const fieldFormats = fieldFormatsMock;

jest.mock('./index_pattern', () => {
  class IndexPattern {
    init = async () => {
      return this;
    };
  }

  return {
    IndexPattern,
  };
});

describe('IndexPatterns', () => {
  let indexPatterns: IndexPatternsService;
  let savedObjectsClient: SavedObjectsClientCommon;

  beforeEach(() => {
    savedObjectsClient = {} as SavedObjectsClientCommon;
    savedObjectsClient.find = jest.fn(
      () =>
        Promise.resolve([{ id: 'id', attributes: { title: 'title' } }]) as Promise<
          Array<SavedObject<any>>
        >
    );
    savedObjectsClient.delete = jest.fn(() => Promise.resolve({}) as Promise<any>);

    indexPatterns = new IndexPatternsService({
      uiSettings: ({
        get: () => Promise.resolve(false),
        getAll: () => {},
      } as any) as UiSettingsCommon,
      savedObjectsClient: (savedObjectsClient as unknown) as SavedObjectsClientCommon,
      apiClient: {} as IIndexPatternsApiClient,
      fieldFormats,
      onNotification: () => {},
      onError: () => {},
      onRedirectNoIndexPattern: () => {},
    });
  });

  test('does cache gets for the same id', async () => {
    const id = '1';
    const indexPattern = await indexPatterns.get(id);

    expect(indexPattern).toBeDefined();
    expect(indexPattern).toBe(await indexPatterns.get(id));
  });

  test('savedObjectCache pre-fetches only title', async () => {
    expect(await indexPatterns.getIds()).toEqual(['id']);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000,
    });
  });

  test('caches saved objects', async () => {
    await indexPatterns.getIds();
    await indexPatterns.getTitles();
    await indexPatterns.getFields(['id', 'title']);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
  });

  test('can refresh the saved objects caches', async () => {
    await indexPatterns.getIds();
    await indexPatterns.getTitles(true);
    await indexPatterns.getFields(['id', 'title'], true);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(3);
  });

  test('deletes the index pattern', async () => {
    const id = '1';
    const indexPattern = await indexPatterns.get(id);

    expect(indexPattern).toBeDefined();
    await indexPatterns.delete(id);
    expect(indexPattern).not.toBe(await indexPatterns.get(id));
  });
});
