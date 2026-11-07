import { TableClient } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';

export class TableStore {
  constructor(client) { this.client = client; }

  async read(partitionKey, rowKey) {
    try { return await this.client.getEntity(partitionKey, rowKey); }
    catch (error) {
      const code = error.code || error.details?.errorCode || error.details?.odataError?.code;
      if (error.statusCode === 404 && code === 'ResourceNotFound') return null;
      throw error;
    }
  }

  async students(partitionKey) {
    const rows = [];
    for await (const entity of this.client.listEntities({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}' and RowKey ge 'student:' and RowKey lt 'student;'` }
    })) rows.push(entity);
    return rows;
  }

  async create(room) { await this.client.createEntity(room); }

  async remove(entity) {
    await this.client.deleteEntity(entity.partitionKey, entity.rowKey, { etag: entity.etag });
  }

  async classrooms() {
    const rows = [];
    for await (const entity of this.client.listEntities({
      queryOptions: { filter: "RowKey eq 'room'" }
    })) rows.push(entity);
    return rows;
  }

  async commit(room, student, createStudent = false) {
    const operations = [['update', room, 'Replace', { etag: room.etag }]];
    if (student) operations.push(createStudent ? ['create', student] : ['update', student, 'Replace', { etag: student.etag }]);
    await this.client.submitTransaction(operations);
  }

  async heartbeat(student, now) {
    if (now - student.lastSeen < 10000) return;
    try {
      await this.client.updateEntity({
        partitionKey: student.partitionKey, rowKey: student.rowKey, lastSeen: now
      }, 'Merge', { etag: student.etag });
    } catch (error) {
      if (error.statusCode !== 412) throw error;
      // A simultaneous progress write already refreshed presence.
    }
  }
}

export function configuredStore(env = process.env) {
  const table = env.LAB3_TABLE_NAME || 'Lab3Classrooms';
  if (env.LAB3_TABLE_CONNECTION_STRING) {
    if (env.LAB3_TABLE_CONNECTION_STRING !== 'UseDevelopmentStorage=true') {
      throw new Error('Connection strings are supported only for local Azurite. Use managed identity in Azure.');
    }
    return new TableStore(TableClient.fromConnectionString(env.LAB3_TABLE_CONNECTION_STRING, table));
  }
  if (!env.LAB3_TABLE_ENDPOINT?.startsWith('https://')) throw new Error('LAB3_TABLE_ENDPOINT must be an HTTPS Table Storage endpoint.');
  return new TableStore(new TableClient(env.LAB3_TABLE_ENDPOINT, table, new DefaultAzureCredential()));
}
