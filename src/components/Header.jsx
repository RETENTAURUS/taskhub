import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectCurrentUserId } from '../store/selectors.js';
import { setCurrentUser } from '../store/uiSlice.js';
import { usersSelectors } from '../store/usersSlice.js';

export default function Header() {
  const dispatch = useDispatch();
  const users = useSelector(usersSelectors.selectAll);
  const currentUserId = useSelector(selectCurrentUserId);

  return (
    <header className="header">
      <Link to="/" className="brand">✔ TaskHub</Link>
      <label className="header__user">
        Masuk sebagai
        <select
          value={users.some((u) => u.id === currentUserId) ? currentUserId : ''}
          onChange={(e) => dispatch(setCurrentUser(e.target.value))}
          disabled={!users.length}
        >
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
    </header>
  );
}
