module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 允许中文 subject，但 type 仍用英文（feat/fix/perf/refactor/docs/chore/test/style/build/ci）
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'docs', 'chore', 'test', 'style', 'build', 'ci', 'revert'],
    ],
    // subject 最小长度 2（中文2字即可），最大 100
    'subject-min-length': [2, 'always', 2],
    'subject-max-length': [2, 'always', 100],
    // subject 不要求以句号结尾
    'subject-full-stop': [0],
    // header 最长 120
    'header-max-length': [2, 'always', 120],
    // body 每行最长 200（中文描述）
    'body-max-line-length': [1, 'always', 200],
  },
};
