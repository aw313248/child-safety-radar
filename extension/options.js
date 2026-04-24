const input = document.getElementById('apiKey')
const saveBtn = document.getElementById('save')
const savedMsg = document.getElementById('saved')

chrome.storage.local.get(['apiKey'], (res) => {
  if (res.apiKey) input.value = res.apiKey
})

saveBtn.addEventListener('click', () => {
  const key = input.value.trim()
  chrome.storage.local.set({ apiKey: key }, () => {
    savedMsg.style.display = 'inline-block'
    setTimeout(() => { savedMsg.style.display = 'none' }, 2000)
    // 清掉 background 快取，讓新 key 立刻生效
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' })
  })
})

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click()
})
