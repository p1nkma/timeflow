export interface UserProfile {
  fullName:   string;
  shortName:  string;
  initials:   string;
  avatarMono: string;
  email:      string;
  role:       string;
  university: string;
  speciality: string;
}

export const MOCK_USER: UserProfile = {
  fullName:   'Михаил Полунин',
  shortName:  'Михаил П.',
  initials:   'МП',
  avatarMono: 'М',
  email:      'poluninmisa140@gmail.com',
  role:       'Студент',
  university: 'МГТУ',
  speciality: 'Программная инженерия',
};
