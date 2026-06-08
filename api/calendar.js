const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  'https://kwjhztdrlftiolfvrkup.supabase.co',
  'sb_publishable_JcuX0-3xqCOsPyN5HQ9TlA_kF4_VgXV'
);

function toICS(tasks) {
  const now = new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  let cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LifeOS//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LifeOS Tasks',
    'X-WR-CALDESC:Công việc từ LifeOS',
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];

  tasks.forEach(t => {
    if (!t.date) return;
    const dtStr = t.date.replace(/-/g,'');
    const uid = `task-${t.id}@lifeos`;
    const summary = t.name || 'Công việc';
    const status = t.done ? 'COMPLETED' : 'NEEDS-ACTION';
    const priority = t.priority === 'high' ? '1' : t.priority === 'mid' ? '5' : '9';
    let dtstart, dtend;
    if (t.time) {
      const timeStr = t.time.replace(':','') + '00';
      dtstart = `DTSTART;TZID=Asia/Ho_Chi_Minh:${dtStr}T${timeStr}`;
      const [h,m] = t.time.split(':').map(Number);
      const endH = String(h+1).padStart(2,'0');
      dtend = `DTEND;TZID=Asia/Ho_Chi_Minh:${dtStr}T${endH}${String(m).padStart(2,'0')}00`;
    } else {
      dtstart = `DTSTART;VALUE=DATE:${dtStr}`;
      dtend = `DTEND;VALUE=DATE:${dtStr}`;
    }
    const desc = [
      t.note ? `Ghi chú: ${t.note}` : '',
      `Tiến độ: ${t.progress || 0}%`,
      `Trạng thái: ${t.status || 'todo'}`,
    ].filter(Boolean).join('\\n');
    const alarm = t.time ? ['BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY',`DESCRIPTION:Nhắc: ${summary}`,'END:VALARM'] : [];
    cal.push('BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${now}`,dtstart,dtend,
      `SUMMARY:${t.priority==='high'?'🔴 ':t.priority==='mid'?'🟡 ':'🟢 '}${summary}`,
      `DESCRIPTION:${desc}`,`STATUS:${status}`,`PRIORITY:${priority}`,...alarm,'END:VEVENT');
  });
  cal.push('END:VCALENDAR');
  return cal.join('\r\n');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { data: tasks } = await db.from('tasks').select('*').eq('done', false).order('date', { ascending: true });
    const ics = toICS(tasks || []);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="lifeos.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.status(200).send(ics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
