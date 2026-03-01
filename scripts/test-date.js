
const dates = [
  '25/12/2000',
  '12/25/2000',
  '2000-12-25',
  '25-12-2000',
  'Dec 25 2000',
  '25 Dec 2000'
];

dates.forEach(d => {
  const parsed = new Date(d);
  console.log(`"${d}" -> ${parsed.toString()} (${isNaN(parsed.getTime()) ? 'Invalid' : 'Valid'})`);
});
