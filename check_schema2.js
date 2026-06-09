import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

console.log("URL:", supabaseUrl)
console.log("AnonKey length:", supabaseAnonKey?.length)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testInsert() {
  // Let's create a temporary period and subject to link the material
  // But wait, it's easier to just find any period and subject in the database.
  const { data: periods, error: pErr } = await supabase.from('report_periods').select('id').limit(1)
  const { data: subjects, error: sErr } = await supabase.from('subjects').select('id').limit(1)
  
  if (pErr || sErr || !periods?.[0] || !subjects?.[0]) {
    console.error("Periods/Subjects fetch error or empty:", pErr, sErr)
    return
  }

  const periodId = periods[0].id
  const subjectId = subjects[0].id

  // Create a temporary material
  const { data: tempMat, error: tempMatErr } = await supabase.from('materials').insert({
    report_period_id: periodId,
    subject_id: subjectId,
    name: 'TEMP_TEST_MATERIAL'
  }).select()

  if (tempMatErr || !tempMat?.[0]) {
    console.error("Failed to create temporary material:", tempMatErr)
    return
  }

  const matId = tempMat[0].id
  console.log("Created temp material ID:", matId)

  // Test cases of copy-pasted characters
  const testStrings = [
    "TP dengan null byte \x00",
    "TP dengan smart quotes “cantik” dan ‘tunggal’",
    "TP dengan em-dash — dan en-dash –",
    "TP dengan bullet • dan list \u2022",
    "TP dengan soft hyphen \u00AD dan zero-width space \u200B",
    "TP dengan control chars \x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f\x10",
    "TP dengan newlines\r\ndan tabs\t",
    "TP dengan foreign key check & percent % sign",
  ]

  for (let i = 0; i < testStrings.length; i++) {
    const rawDesc = testStrings[i]
    const cleanDesc = rawDesc.trim().replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    const code = `T-TEST-${i}`
    
    console.log(`Inserting test case ${i}: [${cleanDesc}]`)
    const { data, error } = await supabase.from('learning_targets').insert({
      material_id: matId,
      code: code,
      description: cleanDesc
    }).select()

    if (error) {
      console.error(`FAIL: Test case ${i} failed:`, error)
    } else {
      console.log(`SUCCESS: Test case ${i} inserted! ID:`, data[0].id)
      // Cleanup immediately
      await supabase.from('learning_targets').delete().eq('id', data[0].id)
    }
  }

  // Cleanup temp material
  await supabase.from('materials').delete().eq('id', matId)
  console.log("Cleanup completed.")
}

testInsert()
