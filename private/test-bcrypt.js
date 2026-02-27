const bcrypt = require('bcrypt');

const hash = '$2y$10$ELVIF1fCio1SMzQ7YabSWO3ODExqmMRzUG2Bx0.JdjfyR4KFgSjIu';

bcrypt.compare('Admin04', hash).then(result => {
  console.log('Admin04 →', result);
});

bcrypt.compare('Admin 04', hash).then(result => {
  console.log('Admin 04 →', result);
});
