// Ready-to-sign letters for the fixes the detector finds. Drafts only: the office may need
// them on stamp paper / notarised, and wording differs by state.
import { docLabel } from '../data/docTypes.js';

const today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

export function buildLetter(issue, member, household, lang = 'en') {
  const [ref, other] = issue.docs;
  const target = issue.targetDocId === ref.id ? ref : other;
  const keep = target === ref ? other : ref;
  const place = [household.district, household.state].filter(Boolean).join(', ') || '__________';
  const refLabel = docLabel(keep.type), tgtLabel = docLabel(target.type);
  const office = issue.fix.office;

  if (issue.field === 'name') {
    if (lang === 'hi') {
      return {
        title: 'नाम में अंतर का शपथ पत्र',
        body: `मैं, ${member.name}, आयु ${member.age} वर्ष, निवासी ${place}, शपथपूर्वक कथन करता/करती हूँ कि:\n\n1. मेरा सही नाम "${keep.value}" है, जो मेरे ${refLabel} में दर्ज है।\n2. मेरे ${tgtLabel} में मेरा नाम "${target.value}" लिखा गया है।\n3. दोनों नाम एक ही व्यक्ति, अर्थात मेरे ही हैं।\n4. यह शपथ पत्र ${office} में नाम सुधार / सत्यापन हेतु प्रस्तुत किया जा रहा है।\n5. उपरोक्त कथन मेरी जानकारी में सत्य है और इसमें कुछ भी असत्य नहीं है।\n\nदिनांक: ${today()}\nस्थान: ${place}\n\nहस्ताक्षर (शपथकर्ता): ______________________\n${member.name}`,
      };
    }
    return {
      title: 'Affidavit of Name Variance',
      body: `I, ${member.name}, aged ${member.age} years, resident of ${place}, do hereby solemnly affirm and state as follows:\n\n1. That my name is correctly recorded as "${keep.value}" in my ${refLabel}.\n2. That my name appears as "${target.value}" in my ${tgtLabel}.\n3. That both names refer to one and the same person, that is, myself.\n4. That this affidavit is submitted to ${office} for correction / verification of the name in the ${tgtLabel}.\n5. That the above statements are true to the best of my knowledge and belief.\n\nDate: ${today()}\nPlace: ${place}\n\nSignature of the deponent: ______________________\n${member.name}`,
    };
  }
  if (lang === 'hi') {
    return {
      title: 'जन्म तिथि सुधार हेतु आवेदन',
      body: `सेवा में,\nप्रभारी अधिकारी, ${office}\n\nविषय: ${tgtLabel} में जन्म तिथि का सुधार\n\nमहोदय/महोदया,\nमैं ${member.name}, आयु ${member.age} वर्ष, निवासी ${place}। मेरे ${refLabel} में मेरी जन्म तिथि "${keep.value}" दर्ज है, जबकि मेरे ${tgtLabel} में "${target.value}" लिखी है। कृपया संलग्न प्रमाणों के आधार पर ${tgtLabel} में जन्म तिथि सही करने की कृपा करें।\n\nसंलग्न: ${issue.fix.proof.join(', ')}\n\nदिनांक: ${today()}\nहस्ताक्षर: ______________________\n${member.name}`,
    };
  }
  return {
    title: 'Application for Correction of Date of Birth',
    body: `To,\nThe Officer-in-Charge, ${office}\n\nSubject: Correction of date of birth in ${tgtLabel}\n\nSir/Madam,\nI, ${member.name}, aged ${member.age} years, resident of ${place}, respectfully submit that my date of birth is recorded as "${keep.value}" in my ${refLabel}, whereas my ${tgtLabel} shows "${target.value}". I request you to correct the date of birth in the ${tgtLabel} on the basis of the enclosed proofs.\n\nEnclosures: ${issue.fix.proof.join(', ')}\n\nDate: ${today()}\nSignature: ______________________\n${member.name}`,
  };
}
