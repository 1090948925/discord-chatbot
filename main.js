const fs = require('fs');
const axios = require('axios-https-proxy-fix');
const qs = require('qs')
const jsonFile = fs.readFileSync('./discord_config.json')
const fileJson = JSON.parse(jsonFile.toString())
const length = fileJson.bot.length
const autoBot = fileJson.autoBot
const enableProxy = fileJson.proxy.enable
const proxyHost = fileJson.proxy.host
const proxyPort = fileJson.proxy.port
const token = fileJson.token

// 主函数
async function main() {
    let amountBot = fileJson.config.length
    for (let index = 0; index < amountBot ;index ++) {
        const { channelID, timeInterval, duration = 1, enableDelete = false, channelName } = fileJson.config[index]
        chat(channelID, timeInterval, duration, enableDelete, channelName)
    }
}

// 执行聊天任务
async function chat(channelID, timeInterval, duration, enableDelete, channelName) {
    const durationTime = duration * 3600 * 1000
    console.log(`chat in channel ${channelName} start, channel id ${channelID}, stop in ${duration} ${duration > 1 ? 'hours' : 'hour'}`);
    let index = 0
    let needStop = false
    const currtime = new Date().getTime()
    while (!needStop) {
        needStop = overLoop(durationTime, currtime)
        try {
            let messageString = ''
            if (autoBot) {
                messageString = await getRemoteMessage(channelID)
            }
            if (messageString === '') {
                messageString = fileJson.bot[index].message.toString()
            }
            const message_data = {
                'content': messageString,
                'tts': 'false',
            }
            index = (index + 1) % length
            await sendMessage(channelID, message_data, enableDelete)
            await sleep(timeInterval * 1000)
        } catch (e) {
            console.log('出错了：' + e)
            await sleep(timeInterval * 1000)
        }
        if (needStop) {
            console.log(`频道${channelID}已退出自动聊天`)
        }
    }
}

// 跳出无限循环条件
function overLoop(duration, startTime) {
    const currtime = new Date().getTime()
    if (currtime - startTime >= duration) {
        return true
    }
    return false
}

// 发送消息间隔
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

// 删除指定消息
async function deleteMessage(msg_id, channel_id, msg_deleted) {
    let url = `https://discord.com/api/v9/channels/${channel_id}/messages/${msg_id}`
    if (enableProxy) {
        await axios.delete(url, {
            headers: {
                'authorization': token.toString()
            },
            proxy: {
                host: proxyHost,
                port: proxyPort
            }
        }).then(() => {
            console.log(`${msg_deleted}删除成功`)
        }).catch((err) => {
            console.log(err);
        })
    } else {
        await axios.delete(url, {
            headers: {
                'authorization': token.toString()
            }
        }).then(() => {
            console.log(`${msg_deleted}删除成功`)
        }).catch((err) => {
            console.log(err);
        })
    }
}

// 发送消息
async function sendMessage(channel_id, message_data, enableDelete) {
    try {
        let url = 'https://discordapp.com/api/v6/channels/' + channel_id + '/messages'
        if (enableProxy) {
            await axios.post(url, message_data, {
                headers: {
                    'content-type': 'application/json',
                    'authorization': token.toString()
                }
                ,proxy: {
                    host: proxyHost,
                    port: proxyPort
                }
            }).then(value => {
                console.log('发送成功：' + message_data.content)
                if (enableDelete) deleteMessage(value.data.id, channel_id, message_data.content)
            }).catch(err => {
                console.log(err.message)
            })
        } else {
            await axios.post(url, message_data, {
                headers: {
                    'content-type': 'application/json',
                    'authorization': token.toString()
                }
            }).then(value => {
                console.log('发送成功：' + message_data.content)
                if (enableDelete) deleteMessage(value.id, channel_id, message_data.content)
            }).catch(err => {
                console.log(err.message)
            })
        }

    } catch (e) {
        console.log(e)
    }
}

//拉取最近的100条消息
async function getRemoteMessage(channelID) {
    try {
        let url = 'https://discordapp.com/api/v6/channels/' + channelID + '/messages?limit=100'
        if (enableProxy) {
            return await axios.get(url, {
                headers: {
                    'content-type': 'application/json',
                    'authorization': token.toString(),
                }
                ,proxy: {
                    host: proxyHost,
                    port: proxyPort
                }
            }).then(value => {
                return generateMessage(value)
            }).catch(err => {
                console.log(err.message)
                return ''
            })
        } else {
            return await axios.get(url, {
                headers: {
                    'content-type': 'application/json',
                    'authorization': token.toString(),
                }
            }).then(value => {
                return generateMessage(value)
            }).catch(err => {
                console.log(err.message)
                return ''
            })
        }

    } catch (e) {
        console.log(e)
        return ''
    }
}

// 在最近的100条消息内随机挑选一条消息
function generateMessage(value) {
    let result_list = []
    let data = value.data
    if (data === '') {
        return ''
    } else {
        for (let { content } of data) {
            const exceptToken = ['<', '@', 'http', '?'] // 过滤敏感信息
            if (content != '' && !exceptToken.find((tk) => content.indexOf(tk) !== -1)) {
                result_list.push(content)
            }
        }
        let randormNumber = Math.ceil(Math.random()* result_list.length)
        if (randormNumber >= result_list.length) {
            randormNumber = 0;
        }
        return result_list[randormNumber]
    }
}

main()
