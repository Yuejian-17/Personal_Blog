/**
 * LRC 歌词解析工具模块
 * @file 提供 LRC 格式歌词的解析与当前播放行定位功能
 * @module js/utils/lrcParser
 */

/**
 * 解析 LRC 格式歌词文本
 * @param {string} lrcText - 原始 LRC 歌词内容
 * @returns {{ time: number, text: string }[]} 按时间排序的歌词行数组
 */
function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];

  // 匹配 [mm:ss.xx] 或 [mm:ss.xxx] 格式的时间标签
  const timeRe = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  for (const line of lines) {
    const match = line.match(timeRe);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    let ms = 0;
    if (match[3]) {
      // 将毫秒补齐为 3 位后再转为秒，保证精度一致
      ms = parseInt(match[3].padEnd(3, '0'), 10) / 1000;
    }
    const time = minutes * 60 + seconds + ms;

    const text = line.replace(timeRe, '').trim();
    if (text) {
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * 根据当前播放时间找到对应的歌词行索引
 * @param {{ time: number }[]} lrcData - 已排序的歌词数组
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {number} 当前歌词行索引，无匹配时返回 -1
 */
function findCurrentLine(lrcData, currentTime) {
  if (!lrcData.length) return -1;
  let idx = -1;
  for (let i = 0; i < lrcData.length; i++) {
    if (lrcData[i].time <= currentTime) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

export { parseLRC, findCurrentLine };
