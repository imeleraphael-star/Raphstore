const bcrypt = require('bcrypt');

bcrypt.hash('Admin04', 10).then(hash => {
  console.log(hash);
});
