const environments = {
  oldProject: {
    url: "https://imwricgokkflresvtvpg.supabase.co",
    key: "sb_publishable_E2RRNUojsNxxcwo_mL_ePQ_ThPz0uK2",
  },
  newProject: {
    url: "https://zadvakjxcnafarpsfbed.supabase.co",
    key: "sb_publishable_2WtEI98eClB2duklIMEMbg_uGM29Mem",
  },
};

const activeEnv = environments.newProject;

export const SB_URL = activeEnv.url;
export const SB_KEY = activeEnv.key;
export const OLD_SB_URL = environments.oldProject.url;
export const OLD_SB_KEY = environments.oldProject.key;
