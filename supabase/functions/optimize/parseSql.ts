export interface SqlStructure {
  tables: string[];
  joins: { type: string; from: string; to: string; condition: string }[];
  aggregates: string[];
  filters: string[];
  groupBy: string[];
}

export function parseSql(query: string): SqlStructure {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  const tables = extractTables(normalizedQuery);
  const joins = extractJoins(normalizedQuery);
  const aggregates = extractAggregates(normalizedQuery);
  const filters = extractFilters(normalizedQuery);
  const groupBy = extractGroupBy(normalizedQuery);

  return {
    tables,
    joins,
    aggregates,
    filters,
    groupBy,
  };
}

function extractTables(query: string): string[] {
  const tables: string[] = [];

  const fromMatch = query.match(/FROM\s+([a-zA-Z0-9_`.\[\]]+)/i);
  if (fromMatch) {
    tables.push(cleanTableName(fromMatch[1]));
  }

  const joinMatches = query.matchAll(/(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+([a-zA-Z0-9_`.\[\]]+)/gi);
  for (const match of joinMatches) {
    tables.push(cleanTableName(match[1]));
  }

  return [...new Set(tables)];
}

function extractJoins(query: string): { type: string; from: string; to: string; condition: string }[] {
  const joins: { type: string; from: string; to: string; condition: string }[] = [];

  const joinPattern = /(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+([a-zA-Z0-9_`.\[\]]+)\s+(?:AS\s+)?([a-zA-Z0-9_`]+)?\s*ON\s+([^JOIN]+?)(?=(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN|WHERE|GROUP|ORDER|LIMIT|$)/gi;

  const matches = query.matchAll(joinPattern);
  for (const match of matches) {
    const type = (match[1] || 'INNER').toUpperCase();
    const tableName = cleanTableName(match[2]);
    const condition = match[4].trim();

    joins.push({
      type,
      from: 'various',
      to: tableName,
      condition,
    });
  }

  return joins;
}

function extractAggregates(query: string): string[] {
  const aggregates: string[] = [];

  const aggPattern = /\b(COUNT|SUM|AVG|MAX|MIN|GROUP_CONCAT)\s*\([^)]+\)/gi;
  const matches = query.matchAll(aggPattern);

  for (const match of matches) {
    aggregates.push(match[0].trim());
  }

  return aggregates;
}

function extractFilters(query: string): string[] {
  const filters: string[] = [];

  if (query.match(/LIKE\s+['"]%/i)) {
    filters.push('LIKE with leading wildcard');
  }

  if (query.match(/\bOR\b/i)) {
    filters.push('OR condition');
  }

  if (query.match(/\bLOWER\s*\(/i) || query.match(/\bUPPER\s*\(/i)) {
    filters.push('Case conversion function (LOWER/UPPER)');
  }

  if (query.match(/meta_key|meta_value/i)) {
    filters.push('WordPress meta_query pattern');
  }

  const whereMatch = query.match(/WHERE\s+(.+?)(?=GROUP|ORDER|LIMIT|HAVING|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1];
    if (whereClause.split(/\bAND\b/i).length > 5) {
      filters.push('Complex WHERE clause with many conditions');
    }
  }

  return filters;
}

function extractGroupBy(query: string): string[] {
  const groupBy: string[] = [];

  const groupByMatch = query.match(/GROUP\s+BY\s+([^HAVING^ORDER^LIMIT]+)/i);
  if (groupByMatch) {
    const columns = groupByMatch[1].split(',').map(col => col.trim());
    groupBy.push(...columns);
  }

  return groupBy;
}

function cleanTableName(name: string): string {
  return name.replace(/[`\[\]]/g, '').trim();
}