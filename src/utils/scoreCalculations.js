/**
 * Utility functions untuk kalkulasi nilai rapor.
 * Murni JavaScript — tidak ada dependency React.
 */

export const calculateFormativeAvg = (studentScoreObj, learningTargets = null) => {
  let vals = []
  if (learningTargets) {
    vals = learningTargets
      .map((tp) => studentScoreObj.scores_formative?.[tp.id])
      .filter((v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v)))
  } else {
    vals = Object.values(studentScoreObj.scores_formative || {}).filter(
      (v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v))
    )
  }
  if (vals.length === 0) return 0
  const sum = vals.reduce((a, b) => a + Number(b), 0)
  return Number((sum / vals.length).toFixed(1))
}

export const calculateSummativeAvg = (studentScoreObj, summatives = null) => {
  let vals = []
  if (summatives) {
    vals = summatives
      .map((sum) => studentScoreObj.scores_summative?.[sum.id])
      .filter((v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v)))
  } else {
    vals = Object.values(studentScoreObj.scores_summative || {}).filter(
      (v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v))
    )
  }
  if (vals.length === 0) return 0
  const sum = vals.reduce((a, b) => a + Number(b), 0)
  return Number((sum / vals.length).toFixed(1))
}

export const calculateAvgOfTwo = (v1, v2) => {
  const n1 = v1 !== '' && v1 !== null && v1 !== undefined ? Number(v1) : null
  const n2 = v2 !== '' && v2 !== null && v2 !== undefined ? Number(v2) : null

  if (n1 !== null && !isNaN(n1) && n2 !== null && !isNaN(n2)) return (n1 + n2) / 2
  if (n1 !== null && !isNaN(n1)) return n1
  if (n2 !== null && !isNaN(n2)) return n2
  return 0
}

export const calculateFinalRaporScore = (studentScoreObj, learningTargets = null, summatives = null) => {
  const fAvg = calculateFormativeAvg(studentScoreObj, learningTargets)
  const sAvg = calculateSummativeAvg(studentScoreObj, summatives)
  const stsAvg = calculateAvgOfTwo(studentScoreObj.sts_practice, studentScoreObj.sts_written)
  const sasAvg = calculateAvgOfTwo(studentScoreObj.sas_practice, studentScoreObj.sas_written)
  const final = (fAvg + sAvg + stsAvg + sasAvg) / 4
  return Math.round(final)
}

// FIX: Konversi tipe data yang benar saat save
export const toNullableNumber = (val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

export const toNumberOrEmpty = (val) => {
  if (val === '' || val === null || val === undefined) return ''
  const n = Number(val)
  return isNaN(n) ? '' : n
}
