import { Client, Events, Partials, TextChannel } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { startScheduledJobs } from "./scheduler";

// Event handlers
import { handleMessageCreate } from "./events/messageCreate";
import { handleTicketMenuInteraction } from "./events/ticketInteractions";
import { closeTicket } from "./commands/ticket";

// 클라이언트 생성
const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages", "GuildMembers", "GuildVoiceStates"],
    partials: [Partials.Channel],
});

// 봇이 준비되었을 때의 이벤트 핸들러
client.once(Events.ClientReady, () => {
    console.log(`Discord bot is ready! 🤖`);
    console.log(`Logged in as ${client.user!.tag}!`);

    // 활동 상태 설정
    client.user?.setActivity('Activity', { type: 3 }); // 3: Watching

    // 명령어 갱신
    console.log("Started refreshing application (/) commands.");
    deployCommands();
    console.log("Successfully reloaded application (/) commands.");

    // 스케줄러 시작
    startScheduledJobs(client);
    console.log("스케줄러가 시작되었습니다.");
});

// 인터랙션 핸들러
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // 슬래시 커맨드 체크
        if (interaction.isChatInputCommand()) {
            const command = commands[interaction.commandName as keyof typeof commands];
            if (!command) return;

            // 옵션 처리를 포함한 명령어 실행
            await command.execute(interaction).catch(async (error) => {
                console.error(`Error executing command ${interaction.commandName}:`, error);

                // 이미 응답된 경우 followUp 사용
                const replyMethod = interaction.replied ? 'followUp' : 'reply';
                await interaction[replyMethod]({
                    content: '명령어 실행 중 오류가 발생했습니다.',
                    ephemeral: true
                });
            });
        }
        
        // String Select Menu 인터랙션 처리
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'create-ticket-menu') {
                await handleTicketMenuInteraction(interaction);
            }
        }
        
        // 버튼 인터랙션 처리
        if (interaction.isButton()) {
            if (interaction.customId === 'close-ticket-button') {
                if (interaction.isChatInputCommand()) {
                    await closeTicket(interaction);
                } else {
                    // Button interaction을 ChatInputCommandInteraction으로 변환
                    await interaction.deferReply();
                    
                    if (!interaction.guild || !interaction.channel) {
                        await interaction.editReply('이 버튼은 서버의 티켓 채널에서만 사용할 수 있습니다.');
                        return;
                    }
                    
                    // closeTicket 함수의 로직을 직접 실행
                    const { ticketSystem } = await import('./utils/ticketSystem');
                    const setup = ticketSystem.getSetup(interaction.guild.id);
                    
                    if (!setup) {
                        await interaction.editReply('티켓 시스템이 설정되지 않았습니다.');
                        return;
                    }

                    await interaction.editReply('⏳ 5초 뒤 티켓이 종료됩니다...');

                    // 로그 저장 및 채널 삭제 로직
                    const { ChannelType, EmbedBuilder, AttachmentBuilder } = await import('discord.js');
                    const fs = await import('fs');
                    const path = await import('path');
                    
                    const logChannel = await interaction.guild.channels.fetch(setup.logChannel);
                    
                    if (logChannel && logChannel.type === ChannelType.GuildText) {
                        try {
                            const messages = await interaction.channel.messages.fetch({ limit: 100 });
                            const sortedMessages = Array.from(messages.values()).reverse();
                            
                            // 채널 이름 가져오기
                            const channelName = interaction.channel.type === ChannelType.GuildText 
                                ? (interaction.channel as TextChannel).name 
                                : 'Unknown';
                            
                            let logText = `티켓 채널: ${channelName}\n`;
                            logText += `종료 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
                            logText += `=`.repeat(50) + '\n\n';
                            
                            for (const message of sortedMessages) {
                                const timestamp = message.createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                                const author = message.author.tag;
                                const content = message.content || '[임베드 또는 첨부 파일]';
                                
                                logText += `[${timestamp}] ${author}: ${content}\n`;
                                
                                if (message.attachments.size > 0) {
                                    message.attachments.forEach(attachment => {
                                        logText += `  └ 첨부: ${attachment.url}\n`;
                                    });
                                }
                            }
                            
                            const tmpDir = path.join(process.cwd(), 'tmp');
                            if (!fs.existsSync(tmpDir)) {
                                fs.mkdirSync(tmpDir, { recursive: true });
                            }
                            
                            const fileName = `ticket-log-${interaction.channel.id}.txt`;
                            const filePath = path.join(tmpDir, fileName);
                            fs.writeFileSync(filePath, logText, 'utf-8');
                            
                            const logEmbed = new EmbedBuilder()
                                .setTitle('📋 티켓 종료')
                                .setDescription(`티켓 **${channelName}**이(가) 종료되었습니다.`)
                                .addFields(
                                    { name: '종료자', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: '종료 시간', value: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }), inline: true }
                                )
                                .setColor(0xFF0000)
                                .setTimestamp();
                            
                            const attachment = new AttachmentBuilder(filePath);
                            
                            await logChannel.send({
                                embeds: [logEmbed],
                                files: [attachment]
                            });
                            
                            fs.unlinkSync(filePath);
                        } catch (error) {
                            console.error('Error saving ticket log:', error);
                        }
                    }

                    await new Promise(resolve => setTimeout(resolve, 5000));
                    ticketSystem.closeTicket(interaction.guild.id, interaction.channel.id);
                    
                    if (interaction.channel.type === ChannelType.GuildText) {
                        await interaction.channel.delete('티켓 종료');
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

// 이벤트 리스너
client.on(Events.MessageCreate, handleMessageCreate);
// 봇 로그인
client.login(config.DISCORD_TOKEN).then(() => {
    console.log("봇이 시작되었습니다.");
});