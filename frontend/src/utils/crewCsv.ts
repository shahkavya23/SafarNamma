/* ─── Crew list as a CSV ───
   The host's roster as a file Excel and Google Sheets open directly: the host first, then
   everyone they approved, in the order they joined. */

import type { Group, GroupMember } from '../types';

const HEADER = ['Username', 'Email', 'Role', 'Joined on (IST)'];

// A leading = + - @ (or tab / carriage return) would make a spreadsheet run the cell as a formula
const cell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

// Always IST, whatever timezone the host's device is set to
const joinedOn = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

export const crewCsv = (group: Group, members: GroupMember[]): string => {
  const rows = [
    HEADER,
    // The host has been on the trip since they started it
    [group.organizer_name ?? '', group.organizer_email ?? '', 'Host', joinedOn(group.created_at)],
    ...members.map((m) => [m.user_name ?? '', m.user_email ?? '', 'Member', joinedOn(m.joined_at)]),
  ];
  return rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
};

const fileName = (title: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug ? `${slug}-crew.csv` : 'crew.csv';
};

export const downloadCrewCsv = (group: Group, members: GroupMember[]) => {
  // The BOM tells Excel the file is UTF-8, so names outside ASCII show correctly
  const blob = new Blob(['﻿', crewCsv(group, members)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(group.title ?? '');
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Let the download start before the URL goes away
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
