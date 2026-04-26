export type Locale = "ru" | "en" | "uz";

export type Translations = {
  datepicker: {
    selectDate: string;
    today: string;
    weekdays: string[];
    months: string[];
  };
  header: {
    courses: string;
    advantages: string;
    platform: string;
    reviews: string;
    faq: string;
    apply: string;
  };
  hero: {
    badge: string;
    title1: string;
    titleHighlight1: string;
    title2: string;
    titleHighlight2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    statGraduates: string;
    statDirections: string;
    statSatisfied: string;
  };
  courses: {
    heading: string;
    headingHighlight: string;
    subtitle: string;
    python: { title: string; desc: string };
    js: { title: string; desc: string };
    java: { title: string; desc: string };
    mobile: { title: string; desc: string };
    devops: { title: string; desc: string };
    datascience: { title: string; desc: string };
    cybersecurity: { title: string; desc: string };
    uiux: { title: string; desc: string };
    english: { title: string; desc: string };
    robotics: { title: string; desc: string };
    months: string;
  };
  advantages: {
    heading: string;
    headingHighlight: string;
    subtitle: string;
    teachers: { title: string; desc: string };
    program: { title: string; desc: string };
    smallGroups: { title: string; desc: string };
    practice: { title: string; desc: string };
    certificate: { title: string; desc: string };
    employment: { title: string; desc: string };
  };
  platform: {
    heading: string;
    headingHighlight: string;
    subtitle: string;
    welcome: string;
    stars: string;
    diamonds: string;
    today: string;
    room: string;
    features: {
      schedule: { title: string; desc: string };
      progress: { title: string; desc: string };
      homework: { title: string; desc: string };
      gamification: { title: string; desc: string };
      achievements: { title: string; desc: string };
      shop: { title: string; desc: string };
    };
  };
  howItWorks: {
    heading: string;
    headingHighlight: string;
    subtitle: string;
    step1: { title: string; desc: string };
    step2: { title: string; desc: string };
    step3: { title: string; desc: string };
    step4: { title: string; desc: string };
  };
  testimonials: {
    heading: string;
    headingHighlight: string;
    subtitle: string;
    items: Array<{ name: string; course: string; text: string; avatar: string }>;
  };
  faq: {
    heading: string;
    headingHighlight: string;
    subtitle: string;
    items: Array<{ q: string; a: string }>;
  };
  form: {
    heading: string;
    headingHighlight: string;
    subtitle: string;
    name: string;
    namePlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    direction: string;
    directionPlaceholder: string;
    comment: string;
    commentOptional: string;
    commentPlaceholder: string;
    submit: string;
    consent: string;
    successTitle: string;
    successText: string;
    errorText: string;
  };
  publicForm: {
    loading: string;
    errorTitle: string;
    errorDesc: string;
    submitBtn: string;
    successTitle: string;
    successText: string;
    errorText: string;
    poweredBy: string;
  };
  footer: {
    description: string;
    navigation: string;
    courses: string;
    contacts: string;
    rights: string;
    poweredBy: string;
  };
};
