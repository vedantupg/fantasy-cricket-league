import { transitionTo } from '../../utils/navigation';

describe('transitionTo', () => {
  afterEach(() => {
    delete (document as any).startViewTransition;
    document.documentElement.classList.remove('navigating-back');
    jest.restoreAllMocks();
  });

  it('navigates directly when View Transitions API is unavailable', () => {
    const navigate = jest.fn();

    transitionTo(navigate, '/dashboard');

    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('uses View Transitions API when available', () => {
    const navigate = jest.fn();
    const finallyMock = jest.fn((cb: () => void) => cb());
    const startViewTransition = jest.fn((cb: () => void) => {
      cb();
      return { finished: { finally: finallyMock } };
    });
    (document as any).startViewTransition = startViewTransition;

    transitionTo(navigate, '/league/abc');

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/league/abc');
    expect(finallyMock).toHaveBeenCalledTimes(1);
  });

  it('applies and removes back-navigation class for back transitions', () => {
    const navigate = jest.fn();
    const addSpy = jest.spyOn(document.documentElement.classList, 'add');
    const removeSpy = jest.spyOn(document.documentElement.classList, 'remove');
    (document as any).startViewTransition = (cb: () => void) => {
      cb();
      return {
        finished: {
          finally: (done: () => void) => done(),
        },
      };
    };

    transitionTo(navigate, -1, true);

    expect(addSpy).toHaveBeenCalledWith('navigating-back');
    expect(removeSpy).toHaveBeenCalledWith('navigating-back');
    expect(navigate).toHaveBeenCalledWith(-1);
    expect(document.documentElement.classList.contains('navigating-back')).toBe(false);
  });
});
