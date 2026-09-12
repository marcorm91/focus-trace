import { describe, expect, it } from 'vitest';
import { ariaRoleRecord } from '../lib/audit/standards-registry';

describe('synchronized WAI-ARIA role relationships', () => {
  it('exposes required accessibility parents from the synchronized registry', () => {
    expect(ariaRoleRecord('listitem')?.requiredParentRoles).toContain('list');
    expect(ariaRoleRecord('cell')?.requiredParentRoles).toContain('row');
    expect(ariaRoleRecord('tab')?.requiredParentRoles).toContain('tablist');
  });

  it('exposes allowed accessibility children from the synchronized registry', () => {
    expect(ariaRoleRecord('list')?.allowedChildRoles).toContain('listitem');
    expect(ariaRoleRecord('tablist')?.allowedChildRoles).toContain('tab');
    expect(ariaRoleRecord('row')?.allowedChildRoles).toEqual(expect.arrayContaining(['cell', 'columnheader', 'gridcell', 'rowheader']));
  });
});
