export const generateRange = (duration) => {
  return {
    [Symbol.iterator]: function* rangeGenerator() {
      let x = 0;
      const step = 1;

      while (x < duration) {
        let hours = Math.floor(x / 3600);
        let minutes = Math.floor((x - hours * 3600) / 60);
        let seconds = Math.ceil(parseInt(x - hours * 3600 - minutes * 60, 10));
        if (hours < 10) {
          hours = `0${hours}`;
        }
        if (minutes < 10) {
          minutes = `0${minutes}`;
        }
        if (seconds < 10) {
          seconds = `0${seconds}`;
        }
        x += step;
        yield `${hours}:${minutes}:${seconds}`;
      }
    },
  };
};

export const getSeconds = (duration) => {
  const [hours, minutes, seconds] = duration.split(":");
  const totalSeconds = +hours * 60 * 60 + +minutes * 60 + +seconds;
  return totalSeconds;
};
