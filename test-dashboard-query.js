
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fzsxkssweptpmrengunf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6c3hrc3N3ZXB0cG1yZW5ndW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwOTE3NTQsImV4cCI6MjA4NTY2Nzc1NH0.-SippbmcSdNx1WHsRn1kC446pglNaM2Ebe624Q63dF0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log('Testing select * from class_requests...');
  
  const { data, error } = await supabase
    .from('class_requests')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success:', JSON.stringify(data, null, 2));
  }
}

testQuery();
