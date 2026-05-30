const MONTH_MAP = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12'
};

export function monthToNumeric(month, year) {
  const key = month.toLowerCase();
  const mm = MONTH_MAP[key];
  if (!mm) {
    throw new Error(`Invalid month: ${month}`);
  }
  return `${year}${mm}`;
}

export function generateRunId(month, year) {
  return `RUN-${monthToNumeric(month, year)}`;
}

export function generatePayslipId(month, year, employeeId) {
  return `PS-${monthToNumeric(month, year)}-${employeeId}`;
}

export function generateEmailLogId(month, year, employeeId) {
  return `MSG-${monthToNumeric(month, year)}-${employeeId}`;
}

export function generateEmployeeId(existingIds) {
  const maxIdNum = existingIds.reduce((max, id) => {
    const num = parseInt(String(id).replace('EMP', '') || '0', 10);
    return num > max ? num : max;
  }, 0);
  return `EMP${String(maxIdNum + 1).padStart(3, '0')}`;
}
