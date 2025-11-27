import { SqlStructure } from './parseSql.ts';

export interface DetectedPattern {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export function detectPatterns(structure: SqlStructure): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  patterns.push(...detectJoinExplosion(structure));
  patterns.push(...detectCountStarBug(structure));
  patterns.push(...detectMissingDistinct(structure));
  patterns.push(...detectNonSargableFilters(structure));
  patterns.push(...detectWordPressMeta(structure));
  patterns.push(...detectMissingGroupBy(structure));

  return patterns;
}

export function detectJoinExplosion(structure: SqlStructure): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const leftJoins = structure.joins.filter(j => j.type === 'LEFT');
  if (leftJoins.length >= 2) {
    patterns.push({
      type: 'join_explosion',
      severity: 'high',
      message: `Multiple LEFT JOINs detected (${leftJoins.length}). This can cause cartesian product and row multiplication.`,
    });
  }

  if (structure.joins.length >= 3 && structure.aggregates.length === 0) {
    patterns.push({
      type: 'join_chain_without_aggregation',
      severity: 'medium',
      message: `${structure.joins.length} JOINs without aggregation may indicate unnecessary complexity or missing GROUP BY.`,
    });
  }

  return patterns;
}

export function detectCountStarBug(structure: SqlStructure): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const hasCountStar = structure.aggregates.some(agg =>
    agg.match(/COUNT\s*\(\s*\*\s*\)/i)
  );

  if (hasCountStar && structure.joins.length > 0) {
    patterns.push({
      type: 'count_star_with_joins',
      severity: 'high',
      message: 'COUNT(*) with JOINs will count duplicated rows. Consider using COUNT(DISTINCT primary_key) or a subquery.',
    });
  }

  return patterns;
}

export function detectMissingDistinct(structure: SqlStructure): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const hasCounts = structure.aggregates.some(agg => agg.match(/COUNT\s*\(/i));
  const hasDistinct = structure.aggregates.some(agg => agg.match(/DISTINCT/i));

  if (hasCounts && !hasDistinct && structure.joins.length >= 2) {
    patterns.push({
      type: 'missing_distinct',
      severity: 'high',
      message: 'COUNT without DISTINCT in a multi-JOIN query will likely produce incorrect results.',
    });
  }

  return patterns;
}

export function detectNonSargableFilters(structure: SqlStructure): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const filter of structure.filters) {
    if (filter.includes('LIKE with leading wildcard')) {
      patterns.push({
        type: 'non_sargable_like',
        severity: 'high',
        message: 'LIKE with leading wildcard (LIKE "%...") prevents index usage and causes full table scans.',
      });
    }

    if (filter.includes('OR condition')) {
      patterns.push({
        type: 'non_sargable_or',
        severity: 'medium',
        message: 'OR conditions can prevent index usage. Consider using UNION or IN clauses instead.',
      });
    }

    if (filter.includes('LOWER') || filter.includes('UPPER')) {
      patterns.push({
        type: 'non_sargable_case_conversion',
        severity: 'medium',
        message: 'LOWER()/UPPER() functions on indexed columns prevent index usage. Use case-insensitive collation or functional indexes.',
      });
    }
  }

  return patterns;
}

export function detectWordPressMeta(structure: SqlStructure): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const hasMetaPattern = structure.filters.some(f => f.includes('WordPress meta_query'));

  if (hasMetaPattern) {
    patterns.push({
      type: 'wordpress_meta_query',
      severity: 'high',
      message: 'WordPress meta_query pattern detected. Multiple JOINs on wp_postmeta cause severe performance issues. Consider custom tables or caching.',
    });
  }

  return patterns;
}

export function detectMissingGroupBy(structure: SqlStructure): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  if (structure.aggregates.length > 0 && structure.groupBy.length === 0) {
    patterns.push({
      type: 'missing_group_by',
      severity: 'medium',
      message: 'Aggregation functions found without GROUP BY. Verify if this is intentional or if GROUP BY is missing.',
    });
  }

  return patterns;
}