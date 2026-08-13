import { EXPRESS_COMPANIES, findExpressCompany, type ExpressCompany } from '../constants/expressCompanies'

export type ExpressValidateResult = {
  ok: boolean
  normalized: string
  message?: string
  suggested?: ExpressCompany
}

/** 去掉空格/特殊分隔，统一大写便于校验 */
export function normalizeExpressNo(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\u3000\-—_]/g, '')
}

function baseOk(s: string): boolean {
  return s.length >= 8 && s.length <= 32 && /^[A-Z0-9]+$/.test(s)
}

type Rule = { test: (s: string) => boolean; hint: string }

/** 常见承运商运单号规则（宽松匹配，避免误拦新号段） */
const RULES: Record<string, Rule> = {
  SF: {
    test: (s) => /^SF\d{10,15}$/.test(s) || /^\d{12,15}$/.test(s),
    hint: '顺丰一般为 SF+10~15 位数字，或 12~15 位纯数字',
  },
  YTO: {
    test: (s) => /^(YT)?\d{10,18}$/.test(s) || /^[A-Z0-9]{10,20}$/.test(s),
    hint: '圆通一般为 YT+数字，或 10~18 位数字/字母数字',
  },
  ZTO: {
    test: (s) => /^\d{12,14}$/.test(s) || /^[A-Z0-9]{10,20}$/.test(s),
    hint: '中通一般为 12~14 位数字',
  },
  STO: {
    test: (s) => /^(77|88|22)\d{11,15}$/.test(s) || /^\d{12,15}$/.test(s) || /^[A-Z0-9]{10,20}$/.test(s),
    hint: '申通一般为 12~15 位数字',
  },
  YUNDA: {
    test: (s) => /^\d{13}$/.test(s) || /^\d{10,18}$/.test(s),
    hint: '韵达一般为 13 位数字',
  },
  LB: {
    // 极兔
    test: (s) => /^(JT)?\d{10,18}$/.test(s) || /^[A-Z0-9]{10,20}$/.test(s),
    hint: '极兔一般为 JT+数字，或 10~18 位数字',
  },
  JD: {
    test: (s) => /^JD[A-Z0-9]{10,20}$/.test(s) || /^[A-Z0-9]{10,22}$/.test(s),
    hint: '京东一般为 JD 开头的字母数字组合',
  },
  DBKD: {
    test: (s) => /^[A-Z0-9]{8,20}$/.test(s),
    hint: '德邦一般为 8~20 位字母数字',
  },
  POSTB: {
    test: (s) => /^\d{13}$/.test(s) || /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(s) || /^[A-Z0-9]{10,20}$/.test(s),
    hint: '邮政快递包裹一般为 13 位数字或国际邮件格式',
  },
  EMS: {
    test: (s) => /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(s) || /^\d{13}$/.test(s) || /^[A-Z0-9]{10,20}$/.test(s),
    hint: 'EMS 一般为字母+数字组合或 13 位数字',
  },
  EYB: {
    test: (s) => /^\d{13}$/.test(s) || /^[A-Z0-9]{10,20}$/.test(s),
    hint: '邮政电商标快一般为 13 位数字',
  },
  CNGG: {
    test: (s) => /^[A-Z0-9]{10,24}$/.test(s),
    hint: '菜鸟裹裹一般为 10~24 位字母数字',
  },
}

/** 按单号前缀推断快递公司（未选手动选公司时辅助） */
export function inferExpressCompanyFromNo(raw: string): ExpressCompany | undefined {
  const s = normalizeExpressNo(raw)
  if (!s) return undefined
  if (/^SF\d/.test(s)) return findExpressCompany('SF')
  if (/^YT\d/.test(s) || /^YTO/.test(s)) return findExpressCompany('YTO')
  if (/^JT\d/.test(s)) return findExpressCompany('LB')
  if (/^JD[A-Z0-9]/.test(s)) return findExpressCompany('JD')
  if (/^DP[A-Z0-9]/.test(s) || /^DEB/.test(s)) return findExpressCompany('DBKD')
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(s)) return findExpressCompany('EMS')
  return undefined
}

export function validateExpressNo(raw: string, companyCodeOrName?: string): ExpressValidateResult {
  const normalized = normalizeExpressNo(raw)
  if (!normalized) {
    return { ok: false, normalized: '', message: '请填写快递单号' }
  }
  if (!baseOk(normalized)) {
    return {
      ok: false,
      normalized,
      message: '运单号一般为 8~32 位字母或数字，请检查是否粘贴多余内容',
      suggested: inferExpressCompanyFromNo(normalized),
    }
  }

  const company = companyCodeOrName ? findExpressCompany(companyCodeOrName) : undefined
  const code = company?.code
  const rule = code ? RULES[code] : undefined
  if (rule && !rule.test(normalized)) {
    return {
      ok: false,
      normalized,
      message: `与「${company?.name || code}」单号格式不太匹配：${rule.hint}`,
      suggested: inferExpressCompanyFromNo(normalized),
    }
  }

  return {
    ok: true,
    normalized,
    suggested: company ? undefined : inferExpressCompanyFromNo(normalized),
  }
}

export function searchExpressCompanies(keyword: string): ExpressCompany[] {
  const q = (keyword || '').trim().toLowerCase()
  const list = EXPRESS_COMPANIES.filter((c) => c.code !== 'NONE')
  if (!q) {
    // 常用优先
    const prefer = ['ZTO', 'YTO', 'YUNDA', 'LB', 'STO', 'SF', 'JD', 'DBKD', 'POSTB', 'EMS', 'EYB', 'CNGG']
    const head = prefer
      .map((code) => list.find((c) => c.code === code))
      .filter((c): c is ExpressCompany => !!c)
    const rest = list.filter((c) => !prefer.includes(c.code))
    return [...head, ...rest]
  }
  return list.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
  )
}

export { EXPRESS_COMPANIES, findExpressCompany }
export type { ExpressCompany }
