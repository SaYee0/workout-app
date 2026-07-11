const GYM_ARRIVAL_MESSAGE = '헬스장에 오신 것만으로도 이미 잘하고 계세요!';

const FINAL_MESSAGES = [
  '와, 일하고 와서도 이렇게 열심히 운동을 하셨다구요? 대단해요!',
  '오늘도 스스로와의 약속을 지켰네요. 정말 멋져요!',
  '이 정도면 몸이 아니라 의지가 진짜 근육이에요!',
  '오늘 운동, 미래의 내가 엄청 고마워할 거예요.',
  '끝까지 해내셨네요. 오늘 하루 중 제일 잘한 일일지도?',
];

function pickFinalMessage() {
  return FINAL_MESSAGES[Math.floor(Math.random() * FINAL_MESSAGES.length)];
}

export { GYM_ARRIVAL_MESSAGE, FINAL_MESSAGES, pickFinalMessage };
