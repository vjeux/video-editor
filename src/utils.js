export const generateRange = (end) => {
  const result = [];
  for (let i = 0; i < end; i += 5) {
    end = end - i;
    let hours = Math.floor(end / 3600);
    let minutes = Math.floor((end - hours * 3600) / 60);
    let seconds = Math.ceil(parseInt(end - hours * 3600 - minutes * 60, 10));
    if (hours < 10) {
      hours = `0${hours}`;
    }
    if (minutes < 10) {
      minutes = `0${minutes}`;
    }
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    result.push(`${hours}:${minutes}:${seconds}`);
  }
  return result;
};

export const getSeconds = (duration) => {
  const [hours, minutes, seconds] = duration.split(":");
  const totalSeconds = +hours * 60 * 60 + +minutes * 60 + +seconds;
  return totalSeconds;
};
